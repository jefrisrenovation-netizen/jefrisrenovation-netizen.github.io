import Foundation
import Capacitor
import StoreKit

@objc(SubscriptionPlugin)
public class SubscriptionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SubscriptionPlugin"
    public let jsName = "Subscription"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "product", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "transactions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise)
    ]
    private let productID = "io.github.jefrisrenovationnetizen.suividesheures.monthly"
    private var observer: Task<Void, Never>?
    private var pending: [UInt64: Transaction] = [:]
    public override func load() {
        observer = Task { @MainActor [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if case .verified(let transaction) = result, transaction.productID == self.productID {
                    self.pending[transaction.id] = transaction
                    self.notifyListeners("transaction", data: ["jws": result.jwsRepresentation])
                }
            }
        }
    }
    deinit { observer?.cancel() }
    @objc func product(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [productID]).first else {
                    call.reject("Subscription unavailable"); return
                }
                call.resolve(["id": product.id, "price": product.displayPrice])
            } catch { call.reject("Cannot load subscription") }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        guard let value = call.getString("accountToken"), let account = UUID(uuidString: value) else {
            call.reject("Sign in first"); return
        }
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [productID]).first else {
                    call.reject("Subscription unavailable"); return
                }
                switch try await product.purchase(options: [.appAccountToken(account)]) {
                case .success(let result):
                    guard case .verified(let transaction) = result else { call.reject("Unverified transaction"); return }
                    pending[transaction.id] = transaction
                    call.resolve(["status": "purchased", "jws": result.jwsRepresentation])
                case .userCancelled: call.resolve(["status": "cancelled"])
                case .pending: call.resolve(["status": "pending"])
                @unknown default: call.reject("Unknown purchase status")
                }
            } catch { call.reject("Purchase failed") }
        }
    }
    private func collect() async -> [String] {
        var receipts: [String] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.productID == productID {
                pending[transaction.id] = transaction
                receipts.append(result.jwsRepresentation)
            }
        }
        for await result in Transaction.unfinished {
            if case .verified(let transaction) = result, transaction.productID == productID,
               !receipts.contains(result.jwsRepresentation) {
                pending[transaction.id] = transaction
                receipts.append(result.jwsRepresentation)
            }
        }
        return receipts
    }
    @objc func transactions(_ call: CAPPluginCall) {
        Task { @MainActor in call.resolve(["receipts": await collect()]) }
    }
    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            do { try await AppStore.sync(); call.resolve(["receipts": await collect()]) }
            catch { call.reject("Restore failed") }
        }
    }
    @objc func finish(_ call: CAPPluginCall) {
        guard let value = call.getString("transactionId"), let id = UInt64(value) else { call.reject("Invalid transaction"); return }
        Task { @MainActor in
            if let transaction = pending[id] { await transaction.finish(); pending.removeValue(forKey: id) }
            call.resolve()
        }
    }
}

class SubscriptionViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() { bridge?.registerPluginInstance(SubscriptionPlugin()) }
}
